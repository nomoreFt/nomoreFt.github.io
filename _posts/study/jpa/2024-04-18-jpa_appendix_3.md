---
layout: post
title: "연관관계 [작성중]"
description: >
    JPA의 기본 사항을 정리한다.
image: /assets/img/study/cleanCover.jpg
categories: [study,jpa]
related_posts:
  
---
* toc
{:toc}


## [Good] 양방향 OneToMany

* 양방향 관계에 대해 부모(Author) - 자식(Books)에 대한 관계로 표현할 수 있다.
* 부모 하나 (행, Row) 는 여러 자식 (행, Row)을 가질 수 있다. (책에서는 참조될 수 있다고 표현된다.)
* 자식 하나 (행, Row) 는 하나의 부모 (행, Row) 만을 가질 수 있다. (책에서는 참조할 수 있다고 표현된다.)

<br>
<br>

### Q: 왜 `연관관계의 주인`은 외래키를 가진 쪽인가? (자식)
{:.read-more}

```markdown
`연관관계의 주인`은 (데이터베이스 or 영속성 콘텍스트) 상의 관계를 결정하고 관리하는 책임을 가진 엔티티를 말한다.
`외래키 열`은 데이터베이스 테이블에서 다른 테이블로의 참조를 관리하는 열이다.
자식 엔티티 (@ManyToOne)는 `외래키 열`을 직접 소유하여 데이터베이스 상의 연결을 관리하고, 그 외래키로 부모 엔티티와의 관계를 관리한다.
또한 자식은 `외래키 열`을 영속성 컨텍스트와 동기화하는 역할을 한다.(book.setAuthor(this)처럼)


최초에는 어린이 반에 보낸 엄마가 있으면 엄마가 `연관관계의 주인` 아닌가? 하는 의구심이 들었었다.
각각 어린이의 가슴에 어머니 성함 명찰을 달아놓는다면 어린이의 명찰(외래키)을 보고 부모를 찾아가는 것이 더 효율적이라고 생각하게 되었다.

즉, `관계에 대한 기록된 단서 (Join Column)`가 있는 쪽이 `연관관계에서는 주인`이 되는게 맞구나 생각이 들었다.
```


<br>

### 부모 - 자식 관계에서의 주요 특징

| 부모                                                                     |  주도권  |                                                                       자식 |
|:-----------------------------------------------------------------------|:-----:|-------------------------------------------------------------------------:|
|                                                                        | ←     |  JoinColumn(외래키)<br/><br/> 연관관계 주인이다. <br/>어떤 부모와 관계를 맺는지 적을 책임을 가지고 있다. |
| 전이(Cascading)<br/> <br/>부모로부터 자식에 대한 생성, 삭제 등이 전이되는게 자연스럽다.                 |   →   |                                                                          |
| 매핑 된(mappedBy)                                                         |   ←   | @ManyToOne<br/><br/>연관관계 주인인 자식으로부터 매핑이 되어<br/> 자식 외래키에 매핑되면 미러링한다는 신호다. |
| 고아 삭제(orphanRemoval)<br/><br/>부모에 의해 생성되지 않은 객체들을 삭제할건지 말건지 부모가 결정한다.       |   →   |                                                                          |
| 동기화 메서드<br/><br/>부모없이 자식이 생기는 일이 없다는 가정하에 <br/>부모쪽에 자식 외래키와 동기화 메서드를 포함시킨다. |   →   |                                                                          |
|  |       |                          @ManyToOne은 기본적으로 EAGER일 수 있는데 LAZY로 설정해주는게 좋다. |
{:.scroll-table-small}
{:.smaller}


~~~java
//file: `연관관계 예시`

@OneToMany(mappedBy = "author"
        ,cascade = CascadeType.ALL
        , orphanRemoval = true)
private List<Book> books = new ArrayList<>();



@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "author_id")
private Author author;
~~~

<br>

### 양방향 OneToMany 관계에서 동기화 메서드가 부모쪽에 있어야 하는 이유는 뭘까?
{:.read-more}



> 대부분의 경우, 자식 엔티티는 부모 엔티티 없이 존재할 수 없다. `<생성 의존성>`
> 예를 들어, 책(Book)이 저자(Author) 없이는 존재할 수 없다. 
> 부모쪽에 관계 동기화 메서드를 놓음으로써 객체의 생성과 관계 설정을 자연스럽게 통합할 수 있다.
>
> 도메인 모델로 생각해도 부모 엔티티가 자식 엔티티보다 더 중심적인 역할을 한다. (모든 도메인의 중요도가 평등하지 않다.)
> 
> 그리고 비즈니스 로직을 부모 엔티티에 집중시키면, 관련 로직이 한 곳에 모여 있어 관리와 유지보수가 용이해진다.(이건 뇌피셜이다.)
{:.note}


<br>

---

### 메서드 종류 및 의도를 알아보자
{:.read-more}


#### [find... 메서드](##){:.heading.flip-title}


**용도**<br>
`find...`, `findBy...`, `findOne...`, `read...`, `get...` 등의 접두사를 사용한 메서드는 엔티티를 조회하는 데 사용됩니다.
<br> <br>
**예시**<br>
`findById`: 주어진 ID로 엔티티를 찾습니다.<br>
`findByName`: 이름으로 엔티티를 조회합니다.<br>
 <br>
이 메서드들은 데이터베이스에서 주어진 조건에 맞는 엔티티를 조회하여 반환합니다.


#### [getReferenceById 메서드](##){:.heading.flip-title}

**설명**<br>
`getReferenceById` 메서드는 지정된 ID에 해당하는 엔티티의 지연로딩 객체를 반환한다.<br>
정확히는 entity 대신 empty proxy placeholder를 할당해놓는다.<br>
이 메서드는 실제 데이터를 데이터베이스에서 즉시 로딩하지 않고, 엔티티에 처음 접근하는 시점에서 데이터를 로딩한다(Lazy Loading).
<br><br>
**이점**<br>
이 방식은 메모리 사용을 최적화하고 성능을 개선할 수 있는 경우에 유용합니다.<br>


![getReferenceById](https://github.com/nomoreFt/nomoreFt.github.io/assets/37995817/50282b94-3de6-4b52-987a-b420499b8cb4){:.centered}{: width="400"}
보통 한 트랜잭션에 한 영속성컨텍스트가 배정된다
{:.figcaption}

[참고글 baeldung-getreferencebyid](https://www.baeldung.com/spring-data-jpa-getreferencebyid-findbyid-methods)
{:.read-more}

#### [fetch](##){:.heading.flip-title}
**설명**<br>
`fetch`는 일반적으로 JPQL 또는 SQL 쿼리에서 명시적으로 사용됩니다.<br>
이는 연관된 엔티티를 즉시 로딩하는 데 사용되며, 쿼리의 성능 최적화를 돕습니다.
<br><br>
**예시**<br>
- `@Query("SELECT u FROM User u JOIN FETCH u.posts WHERE u.id = :id")`: 이 쿼리는 `JOIN FETCH`를 통해 사용자와 그의 게시글을 함께 즉시 로드합니다.



---


## [Bad] 단방향 @OneToMany

단방향 @OneToMany로 사용하는 경우, 중간 외래키 관리 [연결 Table](##)이 생성된다.(author_books 같은)<br>
이로 인해 중간 테이블을 관리하는 복잡성이 증가한다.<br>

* (부모 + 자식) 을 새로 등록할 경우, 외래키 관리 Table에 추가적인 INSERT문이 발생한다.
* 자식들을 삭제/등록 할 경우, 연결 Table에서 모든 연결을 삭제하고 수정된 개수만큼 새로 INSERT한다.
* 연결 Table의 수정이 이뤄지는 경우, 외래키 컬럼과 관련된 인덱스 항목 삭제, 재추가도 성능 저하의 원인이 된다.

<br>
아무래도 외래키에 대한 관리에 대한 공수가 따로 들어간다.

## [Good] 단방향 @ManyToOne

~~~java
//file: `단방향 @ManyToOne`

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "author_id")
private Author author;
~~~

연결 Table이 생성되지 않고 자식이 추가될 때 마다 외래키 컬럼에 부모의 PK가 추가된다.<br>
추가적인 INSERT가 발생하지 않는다는 의미이다.


---

## @ManyToMany 잘 맺는 법
두 엔티티가 모두 부모기 때문에 외래키를 관리해줄 [연결 Table](##)이 생성된다.<br>
그래도 설정에는 오너 (변경사항에 대해 관리하는)를 설정해야 한다.<br>

~~~java
//file: `관계에서 오너 설정`


//Author, 연관관계의 오너이자 변경사항에 대해 관리를 한다. helper method를 통해 관리한다.
@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
@JoinTable(name = "author_book",
        joinColumns = @JoinColumn(name = "author_id"),
        inverseJoinColumns = @JoinColumn(name = "book_id")
)
private Set<Book> books = new HashSet<>();
//addBook, removeBook, removeBooks 등 동기화 & 변경사항 전파용 메서드는 오너에게



//Book
@ManyToMany(mappedBy = "books")
private Set<Author> authors = new HashSet<>();
~~~

* 더 많이 쓰이는 쪽에 오너로 정한다.
* 오너쪽에 보기 편하게 JoinTable로 연관관계 명시해준다.
* 오너쪽에 동기화 메서드를 만들어 변경사항을 전파한다.
* 무조건 Set을 쓴다
* 변겅전이에 ALL, REMOVE를 쓰지 않는다. (다른 곳에서 함께 참조되어 있기 때문에 멋대로 지워지면 안된다)
* 결과적으로 연결테이블과 2개의 OneToMany 단방향처리가 된다.


<br>

### toMany 관계에서 Set vs List 뭐가 더 좋을까?


> HHH-5855 문제 요약
> 
> HHH-5855는 Hibernate에서 java.util.List를 사용하여 엔티티의 자식을 관리할 때 발생했던 버그입니다.<br>
> EntityManager의 merge 메소드를 사용할 때 주의할 점이 있습니다.<br>
> 예를 들어, 엔티티 A가 엔티티 B와 OneToMany(fetch=LAZY, cascade=ALL or (MERGE and PERSIST)) 관계를 맺고 있을 경우,<br>
> 새로운 B 인스턴스를 A에 추가하려고 하면, 커밋 시 중복 insert 명령이 생성될 수 있습니다.
{:.note}

[참고글 HHH-5855문제](https://hibernate.atlassian.net/browse/HHH-5855)
{:.read-more}